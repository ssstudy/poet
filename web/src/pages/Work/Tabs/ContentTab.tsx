import * as React from 'react'
import * as moment from 'moment'
import { Work } from 'poet-js'

import { WorkById } from 'components/atoms/Work'
import { Configuration } from 'configuration'

import './ContentTab.scss'

export class ContentTab extends WorkById {

  renderElement(work?: Work) {
    return (
      <section className="content-tab">
        <section className="attributes">
          <table>
            <tbody>
            {
              work && Object.entries(work.attributes)
                .filter(([key, value]) => key !== 'content')
                .map(this.renderItem)
            }
            </tbody>
          </table>
        </section>
        <section className="content">{ work && work.attributes.content }</section>
      </section>
    )
  }

  renderLoading() {
    return this.renderElement()
  }

  private renderItem = ([key, value]: [string, string]) => {
    return (
      <tr key={key}>
        <td>{key}</td>
        <td>{this.renderItemValue(key, value)}</td>
      </tr>
    )
  }

  private renderItemValue = (key: string, value: string) => {
    if (this.isDateField(key))
      return moment(parseInt(value)).format(Configuration.dateTimeFormat)
    else
      return value
  }

  private isDateField = (key: string) => {
    return ['datePublished', 'dateCreated', 'dateSubmitted', 'dateModified'].includes(key)
  }

}